package com.yapai.akademikaracom.entity;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "libraries")
public class Library {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(mappedBy = "library")
    private User user;

    //List of works
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "library_works",
            joinColumns = @JoinColumn(name = "library_id"),
            inverseJoinColumns = @JoinColumn(name = "work_id")
    )
    private List<Work> workList;

    //List of authors
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "library_authors",
            joinColumns = @JoinColumn(name = "library_id"),
            inverseJoinColumns = @JoinColumn(name = "author_id")
    )
    private List<Author> authorList;

    //List of institutions
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "library_institutions",
            joinColumns = @JoinColumn(name = "library_id"),
            inverseJoinColumns = @JoinColumn(name = "institution_id")
    )
    private List<Institution> institutionList;

    public Library() {
    }

    public Library(Long id,
                   User user,
                   List<Work> workList,
                   List<Author> authorList,
                   List<Institution> institutionList) {
        this.id = id;
        this.user = user;
        this.workList = workList;
        this.authorList = authorList;
        this.institutionList = institutionList;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<Work> getWorkList() {
        return workList;
    }

    public void setWorkList(List<Work> workList) {
        this.workList = workList;
    }

    public List<Author> getAuthorList() {
        return authorList;
    }

    public void setAuthorList(List<Author> authorList) {
        this.authorList = authorList;
    }

    public List<Institution> getInstitutionList() {
        return institutionList;
    }

    public void setInstitutionList(List<Institution> institutionList) {
        this.institutionList = institutionList;
    }
}
